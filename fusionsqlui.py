from PyQt5 import QtCore, QtGui, QtWidgets
from PyQt5.QtWidgets import QApplication, QWidget, QPushButton, QTableWidgetItem, QHeaderView, QFileDialog, QMessageBox
from PyQt5.QtCore import pyqtSlot, pyqtSignal
from main import runSQL, initFusion
from bs4 import BeautifulSoup
import xmltodict
import json
import sys
import xlwt


class Ui_FusionSQL(object):
    button_click = pyqtSignal(str)
    def setupUi(self, FusionSQL):
        FusionSQL.setObjectName("FusionSQL")
        FusionSQL.setWindowModality(QtCore.Qt.ApplicationModal)
        FusionSQL.resize(1014, 742)
        sizePolicy = QtWidgets.QSizePolicy(QtWidgets.QSizePolicy.Expanding, QtWidgets.QSizePolicy.Expanding)
        sizePolicy.setHorizontalStretch(255)
        sizePolicy.setVerticalStretch(255)
        sizePolicy.setHeightForWidth(FusionSQL.sizePolicy().hasHeightForWidth())
        FusionSQL.setSizePolicy(sizePolicy)
        FusionSQL.setSizeIncrement(QtCore.QSize(107, 0))
        self.formLayout = QtWidgets.QFormLayout(FusionSQL)
        self.formLayout.setObjectName("formLayout")
        self.groupBox = QtWidgets.QGroupBox(FusionSQL)
        sizePolicy = QtWidgets.QSizePolicy(QtWidgets.QSizePolicy.Expanding, QtWidgets.QSizePolicy.Expanding)
        sizePolicy.setHorizontalStretch(255)
        sizePolicy.setVerticalStretch(255)
        sizePolicy.setHeightForWidth(self.groupBox.sizePolicy().hasHeightForWidth())
        self.groupBox.setSizePolicy(sizePolicy)
        self.groupBox.setSizeIncrement(QtCore.QSize(10000, 10000))
        self.groupBox.setFocusPolicy(QtCore.Qt.ClickFocus)
        self.groupBox.setObjectName("groupBox")
        self.SQLtextEdit = QtWidgets.QPlainTextEdit(self.groupBox)
        self.SQLtextEdit.setGeometry(QtCore.QRect(40, 106, 911, 271))
        sizePolicy = QtWidgets.QSizePolicy(QtWidgets.QSizePolicy.Expanding, QtWidgets.QSizePolicy.Expanding)
        sizePolicy.setHorizontalStretch(255)
        sizePolicy.setVerticalStretch(255)
        sizePolicy.setHeightForWidth(self.SQLtextEdit.sizePolicy().hasHeightForWidth())
        self.SQLtextEdit.setSizePolicy(sizePolicy)
        self.SQLtextEdit.setSizeIncrement(QtCore.QSize(10000, 10000))
        self.SQLtextEdit.setMouseTracking(True)
        self.SQLtextEdit.setFocusPolicy(QtCore.Qt.StrongFocus)
        self.SQLtextEdit.setContextMenuPolicy(QtCore.Qt.DefaultContextMenu)
        self.SQLtextEdit.setToolTip("")
        self.SQLtextEdit.setToolTipDuration(-1)
        self.SQLtextEdit.setStatusTip("")
        self.SQLtextEdit.setWhatsThis("")
        self.SQLtextEdit.setDocumentTitle("")
        self.SQLtextEdit.setPlainText("")
        self.SQLtextEdit.setPlaceholderText("Your SQL query goes here")
        self.SQLtextEdit.setObjectName("SQLtextEdit")
        self.pushButton = QtWidgets.QPushButton(self.groupBox)
        self.pushButton.setGeometry(QtCore.QRect(850, 50, 93, 28))
        self.pushButton.clicked.connect(self.button_click)
        sizePolicy = QtWidgets.QSizePolicy(QtWidgets.QSizePolicy.Expanding, QtWidgets.QSizePolicy.Expanding)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.pushButton.sizePolicy().hasHeightForWidth())
        self.pushButton.setSizePolicy(sizePolicy)
        self.pushButton.setObjectName("pushButton")
        self.pushButton3 = QtWidgets.QPushButton(self.groupBox)
        self.pushButton3.setGeometry(QtCore.QRect(820, 16, 153, 28))
        self.pushButton3.clicked.connect(self.initializeFusion)
        self.pushButton.setSizePolicy(sizePolicy)
        self.pushButton.setObjectName("pushButton3")
        self.progressBar = QtWidgets.QProgressBar(self.groupBox)
        self.progressBar.setGeometry(QtCore.QRect(410, 50, 371, 23))
        sizePolicy = QtWidgets.QSizePolicy(QtWidgets.QSizePolicy.Expanding, QtWidgets.QSizePolicy.Expanding)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.progressBar.sizePolicy().hasHeightForWidth())
        self.progressBar.setSizePolicy(sizePolicy)
        #self.progressBar.setProperty("value", 24)
        self.progressBar.setObjectName("progressBar")
        self.instanceEdit = QtWidgets.QLineEdit(self.groupBox)
        self.instanceEdit.setGeometry(QtCore.QRect(40, 20, 701, 22))
        sizePolicy = QtWidgets.QSizePolicy(QtWidgets.QSizePolicy.Expanding, QtWidgets.QSizePolicy.Expanding)
        sizePolicy.setHorizontalStretch(255)
        sizePolicy.setVerticalStretch(255)
        sizePolicy.setHeightForWidth(self.instanceEdit.sizePolicy().hasHeightForWidth())
        self.instanceEdit.setSizePolicy(sizePolicy)
        self.instanceEdit.setSizeIncrement(QtCore.QSize(10000, 10000))
        self.instanceEdit.setInputMethodHints(QtCore.Qt.ImhUrlCharactersOnly)
        self.instanceEdit.setInputMask("")
        self.instanceEdit.setObjectName("instanceEdit")
        self.usernameEdit = QtWidgets.QLineEdit(self.groupBox)
        self.usernameEdit.setGeometry(QtCore.QRect(40, 40, 341, 22))
        sizePolicy = QtWidgets.QSizePolicy(QtWidgets.QSizePolicy.Expanding, QtWidgets.QSizePolicy.Expanding)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.usernameEdit.sizePolicy().hasHeightForWidth())
        self.usernameEdit.setSizePolicy(sizePolicy)
        self.usernameEdit.setSizeIncrement(QtCore.QSize(10000, 10000))
        self.usernameEdit.setObjectName("usernameEdit")
        self.passwordEdit = QtWidgets.QLineEdit(self.groupBox)
        self.passwordEdit.setGeometry(QtCore.QRect(40, 60, 341, 22))
        sizePolicy = QtWidgets.QSizePolicy(QtWidgets.QSizePolicy.Expanding, QtWidgets.QSizePolicy.Expanding)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.passwordEdit.sizePolicy().hasHeightForWidth())
        self.passwordEdit.setSizePolicy(sizePolicy)
        self.passwordEdit.setSizeIncrement(QtCore.QSize(10000, 10000))
        self.passwordEdit.setInputMethodHints(QtCore.Qt.ImhHiddenText|QtCore.Qt.ImhNoAutoUppercase|QtCore.Qt.ImhNoPredictiveText|QtCore.Qt.ImhSensitiveData)
        self.passwordEdit.setEchoMode(QtWidgets.QLineEdit.Password)
        self.passwordEdit.setObjectName("passwordEdit")
        self.label = QtWidgets.QLabel(self.groupBox)
        self.label.setGeometry(QtCore.QRect(350, 90, 71, 16))
        sizePolicy = QtWidgets.QSizePolicy(QtWidgets.QSizePolicy.Expanding, QtWidgets.QSizePolicy.Expanding)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.label.sizePolicy().hasHeightForWidth())
        self.label.setSizePolicy(sizePolicy)
        self.label.setObjectName("label")
        self.scrollArea = QtWidgets.QScrollArea(self.groupBox)
        self.scrollArea.setGeometry(QtCore.QRect(10, 410, 961, 291))
        self.scrollArea.setWidgetResizable(True)
        self.scrollArea.setObjectName("scrollArea")
        self.scrollAreaWidgetContents = QtWidgets.QWidget()
        self.scrollAreaWidgetContents.setGeometry(QtCore.QRect(0, 0, 959, 289))
        sizePolicy = QtWidgets.QSizePolicy(QtWidgets.QSizePolicy.Expanding, QtWidgets.QSizePolicy.Expanding)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.scrollAreaWidgetContents.sizePolicy().hasHeightForWidth())
        self.scrollAreaWidgetContents.setSizePolicy(sizePolicy)
        self.scrollAreaWidgetContents.setObjectName("scrollAreaWidgetContents")
        self.tableWidget = QtWidgets.QTableWidget(self.scrollAreaWidgetContents)
        self.tableWidget.setGeometry(QtCore.QRect(10, 10, 941, 271))
        self.tableWidget.setObjectName("tableWidget")
        self.tableWidget.setColumnCount(0)
        self.tableWidget.setRowCount(0)
        self.tableWidget.setHorizontalScrollBarPolicy(QtCore.Qt.ScrollBarAsNeeded)
        self.scrollArea.setWidget(self.scrollAreaWidgetContents)
        self.formLayout.setWidget(0, QtWidgets.QFormLayout.SpanningRole, self.groupBox)
        self.pushButton_2 = QtWidgets.QPushButton(self.groupBox)
        self.pushButton_2.setGeometry(QtCore.QRect(445, 378, 101, 31))
        sizePolicy.setHeightForWidth(self.pushButton_2.sizePolicy().hasHeightForWidth())
        self.pushButton_2.setSizePolicy(sizePolicy)
        self.pushButton_2.setObjectName("pushButton_2")
        self.pushButton_2.clicked.connect(self.savefile)
        self.pushButton_2.setEnabled(False)
        self.retranslateUi(FusionSQL)
        QtCore.QMetaObject.connectSlotsByName(FusionSQL)

    def retranslateUi(self, FusionSQL):
        _translate = QtCore.QCoreApplication.translate
        FusionSQL.setWindowTitle(_translate("FusionSQL", "FusionSQL"))
        self.groupBox.setTitle(_translate("FusionSQL", "Fusion SQL"))
        self.pushButton3.setText(_translate("FusionSQL", "Initialize environment"))
        self.pushButton.setText(_translate("FusionSQL", "Run query"))
        self.instanceEdit.setPlaceholderText(_translate("FusionSQL", "Enter your Fusion Instance URL"))
        self.usernameEdit.setPlaceholderText(_translate("FusionSQL", "Enter your Username"))
        self.passwordEdit.setPlaceholderText(_translate("FusionSQL", "Enter your Password"))
        self.label.setText(_translate("FusionSQL", "SQL Query"))
        self.pushButton_2.setText(_translate("FusionSQL", "Export to excel"))

    def launch_Thread(self):
        t = threading.Thread(target=self.log)
        t.start()

    def showdialog(self):
        msg = QMessageBox()
        msg.setIcon(QMessageBox.Information)
        msg.setText("Your query results have been exported successfully")
        msg.setWindowTitle("File export successful")
        msg.setStandardButtons(QMessageBox.Ok)
        retval = msg.exec_()

    def savefile(self):
        filename,_ = QFileDialog.getSaveFileName(None, 'Save File', '', ".xls(*.xls)")
        if filename is not None or len(filename)>=0:
            wbk = xlwt.Workbook()
            sheet = wbk.add_sheet("sheet", cell_overwrite_ok=True)
            style = xlwt.XFStyle()
            font = xlwt.Font()
            font.bold = True
            style.font = font
            model = self.tableWidget.model()
            for c in range(model.columnCount()):
                text = model.headerData(c, QtCore.Qt.Horizontal)
                sheet.write(0, c+1, text, style=style)

            for r in range(model.rowCount()):
                text = model.headerData(r, QtCore.Qt.Vertical)
                sheet.write(r+1, 0, text, style=style)

            for c in range(model.columnCount()):
                for r in range(model.rowCount()):
                    text = model.data(model.index(r, c))
                    sheet.write(r+1, c+1, text)
            wbk.save(filename)
            self.showdialog()


    def initializeFusion(self):
        instanceURLtext = self.instanceEdit.text()
        fusionUserText = self.usernameEdit.text()
        fusionPWtext = self.passwordEdit.text()
        initFusion(instanceURLtext, fusionUserText, fusionPWtext)
        msg = QMessageBox()
        msg.setIcon(QMessageBox.Information)
        msg.setText("The environment has been initialized successfully")
        msg.setWindowTitle("Initialized")
        msg.setStandardButtons(QMessageBox.Ok)
        retval = msg.exec_()

    def button_click(self):
        self.progressBar.setProperty("value", 0)
        instanceURLtext = self.instanceEdit.text()
        fusionUserText = self.usernameEdit.text()
        self.progressBar.setProperty("value", 20)
        fusionPWtext = self.passwordEdit.text()
        sqlquery = self.SQLtextEdit.toPlainText()
        self.progressBar.setProperty("value", 30)
        resultXML = runSQL(instanceURLtext, sqlquery, fusionUserText, fusionPWtext)
        self.progressBar.setProperty("value", 45)
        s1 = BeautifulSoup(resultXML,'xml')
        rb = s1.findAll('ROW')
        self.progressBar.setProperty("value", 60)
        try:
            columns = [tag.name for tag in s1.find_all()]
            notN = set(['ROW','ROWSET'])
            columns = [x for x in columns if not (x in notN)]
            columns = list(dict.fromkeys(columns))
            #columns = set(filter(lambda a: a != 'ROW' and a != 'ROWSET', columns))
            #columns = list(columns)
            self.tableWidget.setColumnCount(len(columns))
            resJson = json.loads(json.dumps(xmltodict.parse(resultXML)))
            rowset = resJson['ROWSET']
            self.progressBar.setProperty("value", 75)
            if str(type(rowset['ROW'])) == '<class \'dict\'>':
                self.tableWidget.setRowCount(1)
                for c in range(len(columns)):
                    self.tableWidget.setItem(0, c, QTableWidgetItem(rowset['ROW'][columns[c]]))
            else:
                self.tableWidget.setRowCount(len(rowset['ROW']))
                for i in range(len(rowset['ROW'])):
                    for c in range(len(columns)):
                        self.tableWidget.setItem(i, c, QTableWidgetItem(rowset['ROW'][i][columns[c]]))
            self.pushButton_2.setEnabled(True)
        except:
            self.tableWidget.setRowCount(1)
            self.tableWidget.setColumnCount(2)
            self.progressBar.setProperty("value", 80)
            if resultXML is None:
                self.tableWidget.setItem(0, 0, QTableWidgetItem("Error running the SQL query. Please validate the URL, Credentials, Query or your network connection"))
            else:
                self.tableWidget.setItem(0, 0, QTableWidgetItem(resultXML))
        self.progressBar.setProperty("value", 85)
        self.tableWidget.setHorizontalScrollBarPolicy(QtCore.Qt.ScrollBarAsNeeded)
        self.tableWidget.setHorizontalHeaderLabels(columns)
        self.tableWidget.resizeColumnsToContents()
        self.progressBar.setProperty("value", 100)
        return True


if __name__ == "__main__":
    app = QtWidgets.QApplication(sys.argv)
    FusionSQL = QtWidgets.QWidget()
    ui = Ui_FusionSQL()
    ui.setupUi(FusionSQL)
    FusionSQL.show()
    app.exec_()